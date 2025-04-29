using UnityEngine;
using System.Collections;

public class Bullet : MonoBehaviour
{
    [SerializeField] private int damage = 1;
    [SerializeField] private GameObject hitEffectPrefab;
    [SerializeField] private float lifeTime = 3f; // 최대 생존 시간
    
    private void OnEnable()
    {
        // 최대 생존 시간 후 자동 파괴
        Destroy(gameObject, lifeTime);
    }
    
    private void OnTriggerEnter2D(Collider2D other)
    {
        Debug.Log("총알 충돌: " + other.gameObject.name + " (태그: " + other.tag + ")");
        
        // 적과 충돌했을 때 처리
        if (other.CompareTag("Enemy"))
        {
            // 적에게 데미지 주기
            // Enemy 클래스가 구현되면 아래 코드의 주석을 해제
            // Enemy enemy = other.GetComponent<Enemy>();
            // if (enemy != null)
            // {
            //     enemy.TakeDamage(damage);
            // }
            
            // 적을 잠시 빨간색으로 변경 (시각적 피드백)
            SpriteRenderer enemySprite = other.GetComponent<SpriteRenderer>();
            if (enemySprite != null)
            {
                StartCoroutine(FlashColor(enemySprite));
            }
            
            // 히트 이펙트 생성 (있는 경우)
            SpawnHitEffect();
            
            // 총알 파괴
            Destroy(gameObject);
        }
        // 벽이나 다른 장애물과 충돌했을 때 처리
        else if (other.CompareTag("Wall") || other.CompareTag("Obstacle"))
        {
            // 히트 이펙트 생성 (있는 경우)
            SpawnHitEffect();
            
            // 총알 파괴
            Destroy(gameObject);
        }
        // 아무런 태그가 없는 경우에도 파괴 (테스트 환경에서)
        else
        {
            Destroy(gameObject);
        }
    }
    
    // 히트 이펙트 생성 메서드
    private void SpawnHitEffect()
    {
        if (hitEffectPrefab != null)
        {
            GameObject effect = Instantiate(hitEffectPrefab, transform.position, Quaternion.identity);
            // 1초 후 이펙트 자동 파괴
            Destroy(effect, 1f);
        }
    }
    
    // 적 스프라이트를 잠시 빨간색으로 변경하는 코루틴
    private IEnumerator FlashColor(SpriteRenderer sprite)
    {
        Color originalColor = sprite.color;
        sprite.color = Color.red;
        yield return new WaitForSeconds(0.1f);
        if (sprite != null)
        {
            sprite.color = originalColor;
        }
    }
    
    // 데미지 설정 메서드 (PlayerWeapon에서 호출)
    public void SetDamage(int newDamage)
    {
        damage = newDamage;
    }
    
    // 화면 밖으로 나갔을 때 호출되는 메서드
    private void OnBecameInvisible()
    {
        // 화면 밖으로 나갔을 때 총알 파괴
        Destroy(gameObject);
    }
} 